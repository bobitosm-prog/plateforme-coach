import XCTest
import StoreKit
import StoreKitTest
import UIKit
@testable import MoovXPrototype

final class AthenaCatalogTests: XCTestCase {
    private var session: SKTestSession!

    override func setUpWithError() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Athena", withExtension: "storekit"))
        session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
    }

    override func tearDownWithError() throws {
        session.clearTransactions()
        session = nil
    }

    func testLoadsRealStoreKitCatalogueWithoutPurchasingOrIntroTrial() async throws {
        let products = try await AthenaCatalog.load()
        XCTAssertEqual(products.map(\.id), AthenaCatalog.saleOffers.map(\.rawValue))
        XCTAssertEqual(products.map(\.price), [Decimal(string: "9.90")!, Decimal(string: "79.90")!])
        XCTAssertTrue(products.allSatisfy { !$0.displayPrice.isEmpty })
        XCTAssertTrue(products.allSatisfy { $0.priceFormatStyle.currencyCode == "CHF" })
        XCTAssertTrue(session.allTransactions().isEmpty)
    }

    func testRejectsPartialStoreKitResponse() async throws {
        let products = try await Product.products(for: [AthenaOffer.monthly.rawValue])
        XCTAssertEqual(products.count, 1)
        XCTAssertThrowsError(try AthenaCatalog.validate(products))
    }

    func testStoreKitFailureCanBeRetried() async throws {
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        do {
            _ = try await AthenaCatalog.load()
            XCTFail("A failed StoreKit request must not return a catalogue")
        } catch {}
        try await session.setSimulatedError(nil, forAPI: .loadProducts)
        let products = try await AthenaCatalog.load()
        XCTAssertEqual(products.count, 2)
    }

    @MainActor
    func testPurchaseRemainsUnfinishedUntilServerAcknowledgementAndIsAccountScoped() async throws {
        let manager = ApplePurchaseManager()
        let owner = UUID()
        // Simulate a lifetime purchase made before the offer was suspended.
        let legacyProducts = try await Product.products(for: [AthenaOffer.lifetime.rawValue])
        let legacy = try XCTUnwrap(legacyProducts.first)
        _ = try await legacy.purchase(options: [.appAccountToken(owner)])
        _ = try await manager.collect(token: owner, restore: false)
        let payloads = try manager.payloads(token: owner)
        XCTAssertEqual(payloads.count, 1)
        XCTAssertFalse(payloads[0]["signedTransaction"]!.isEmpty)
        XCTAssertTrue(try manager.payloads(token: UUID()).isEmpty)
        let id = try XCTUnwrap(UInt64(payloads[0]["id"]!))
        do {
            try await manager.finish(id: id, token: UUID())
            XCTFail("Another account must never finish the purchase")
        } catch {}
        // Simulates a server outage + app restart: StoreKit still owns the transaction.
        let restarted = ApplePurchaseManager()
        let recovered = try await restarted.collect(token: owner, restore: false)
        XCTAssertEqual((recovered["transactions"] as? [[String: String]])?.count, 1)
        try await restarted.finish(id: id, token: owner)
        XCTAssertTrue(try restarted.payloads(token: owner).isEmpty)
        var stillUnfinished = false
        for await result in Transaction.unfinished {
            if case .verified(let transaction) = result, transaction.id == id { stillUnfinished = true }
        }
        XCTAssertFalse(stillUnfinished)
        // A finished lifetime purchase remains restorable without charging again.
        var entitled = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.id == id { entitled = true }
        }
        XCTAssertTrue(entitled)
    }

    @MainActor
    func testUIKitPurchaseUsesTheActiveWindowScene() async throws {
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let manager = ApplePurchaseManager()
        let owner = UUID()
        let reply = try await manager.purchase(productID: AthenaOffer.monthly.rawValue, token: owner, scene: scene)
        XCTAssertEqual(reply["status"] as? String, "success")
        let transactions = try XCTUnwrap(reply["transactions"] as? [[String: String]])
        XCTAssertEqual(transactions.count, 1)
        let id = try XCTUnwrap(UInt64(transactions[0]["id"] ?? ""))
        try await manager.finish(id: id, token: owner)
    }

    @MainActor
    func testLifetimeIsNotAvailableForNewPurchases() async throws {
        do {
            _ = try await ApplePurchaseManager().purchase(productID: AthenaOffer.lifetime.rawValue, token: UUID())
            XCTFail("The suspended lifetime offer must not be purchasable")
        } catch {}
        XCTAssertTrue(session.allTransactions().isEmpty)
    }

    @MainActor
    func testNavigationChangeBeforeStoreKitPresentationDoesNotCharge() async throws {
        let manager = ApplePurchaseManager()
        do {
            _ = try await manager.purchase(productID: AthenaOffer.monthly.rawValue, token: UUID(), canPresent: { false })
            XCTFail("Navigation changes must cancel presentation")
        } catch {}
        XCTAssertTrue(session.allTransactions().isEmpty)
    }
}

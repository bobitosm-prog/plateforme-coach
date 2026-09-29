import XCTest
import StoreKit
import StoreKitTest
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
        XCTAssertEqual(products.map(\.id), AthenaOffer.allCases.map(\.rawValue))
        XCTAssertEqual(products.map(\.price), [Decimal(10), Decimal(80), Decimal(150)])
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
        XCTAssertEqual(products.count, 3)
    }
}

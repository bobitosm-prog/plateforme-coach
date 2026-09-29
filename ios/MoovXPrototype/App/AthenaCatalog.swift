import StoreKit

/// Product IDs are the only commercial constants shipped by the app.
/// Prices and periods must come from StoreKit, never from the local test fixture.
enum AthenaOffer: String, CaseIterable {
    case monthly = "ch.moovx.app.athena.monthly"
    case yearly = "ch.moovx.app.athena.yearly"
    case lifetime = "ch.moovx.app.athena.lifetime"
}

enum AthenaCatalog {
    enum CatalogError: Error {
        case incompleteProducts
        case invalidProductConfiguration
    }

    static func load() async throws -> [Product] {
        let products = try await Product.products(for: AthenaOffer.allCases.map(\.rawValue))
        return try validate(products)
    }

    /// Fail closed if Apple returns a partial or incompatible catalogue.
    /// Loading products does not purchase anything or grant an entitlement.
    static func validate(_ products: [Product]) throws -> [Product] {
        guard products.count == AthenaOffer.allCases.count,
              Set(products.map(\.id)) == Set(AthenaOffer.allCases.map(\.rawValue)) else {
            throw CatalogError.incompleteProducts
        }
        let ordered = AthenaOffer.allCases.compactMap { offer in products.first { $0.id == offer.rawValue } }
        guard ordered[2].type == .nonConsumable,
              ordered[0].type == .autoRenewable, ordered[1].type == .autoRenewable,
              let monthly = ordered[0].subscription, let yearly = ordered[1].subscription,
              monthly.subscriptionGroupID == yearly.subscriptionGroupID,
              monthly.subscriptionPeriod.value == 1, monthly.subscriptionPeriod.unit == .month,
              yearly.subscriptionPeriod.value == 1, yearly.subscriptionPeriod.unit == .year,
              monthly.introductoryOffer == nil, yearly.introductoryOffer == nil else {
            throw CatalogError.invalidProductConfiguration
        }
        return ordered
    }
}

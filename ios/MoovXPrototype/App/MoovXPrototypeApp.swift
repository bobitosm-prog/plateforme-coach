import SwiftUI

@main
struct MoovXPrototypeApp: App {
    var body: some Scene { WindowGroup { PrototypeHome() } }
}

struct PrototypeHome: View {
    @State private var showWeb = ProcessInfo.processInfo.arguments.contains("--open-moovx")
    private let gold = Color(red: 0.91, green: 0.77, blue: 0.37)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.system(size: 56)).foregroundStyle(gold).accessibilityHidden(true)
                    Text("MoovX").font(.largeTitle.bold())
                    Text("Prototype iPhone").font(.title2)
                    Text("Première étape : vérifier l’affichage de MoovX dans une application iPhone. Ce prototype n’est pas une version App Store.")
                        .foregroundStyle(.secondary)
                    Label("Aucun accès à Apple Santé", systemImage: "heart")
                    Label("Pas d’achat Apple ni de synchronisation Watch", systemImage: "applewatch")
                    Text("Le bouton ci-dessous ouvre le site de production. Utiliser uniquement un compte de test dédié ; les actions dans le site peuvent modifier ses données réelles.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Button { showWeb = true } label: {
                        Text("Ouvrir MoovX").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 10)
                    }
                    .buttonStyle(.borderedProminent).tint(gold).foregroundStyle(.black)
                    .accessibilityIdentifier("open-moovx")
                }.padding(28)
            }
            .background(Color(red: 0.045, green: 0.04, blue: 0.025))
            .navigationTitle("Préparation iOS")
            .sheet(isPresented: $showWeb) { PrototypeBrowser() }
        }
        .preferredColorScheme(.dark)
    }
}

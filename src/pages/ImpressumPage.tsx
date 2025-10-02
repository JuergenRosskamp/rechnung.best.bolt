import { FileText, ArrowLeft } from 'lucide-react';

export default function ImpressumPage() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Impressum</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Angaben gemäß § 5 TMG</h2>
            <p className="text-gray-700">
              [Firmenname]<br />
              [Straße und Hausnummer]<br />
              [PLZ und Ort]<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Vertreten durch</h2>
            <p className="text-gray-700">
              [Name des Geschäftsführers/Inhabers]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Kontakt</h2>
            <p className="text-gray-700">
              Telefon: [Telefonnummer]<br />
              E-Mail: [E-Mail-Adresse]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Umsatzsteuer-ID</h2>
            <p className="text-gray-700">
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
              [USt-IdNr.]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">EU-Streitschlichtung</h2>
            <p className="text-gray-700">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              <br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Verbraucherstreitbeilegung/Universalschlichtungsstelle
            </h2>
            <p className="text-gray-700">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Haftung für Inhalte</h2>
            <p className="text-gray-700 space-y-2">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
              Tätigkeit hinweisen.
              <br /><br />
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
              allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
              erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
              Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
              entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Haftung für Links</h2>
            <p className="text-gray-700">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
              übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
              Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
              Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
              Zeitpunkt der Verlinkung nicht erkennbar.
              <br /><br />
              Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
              Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Urheberrecht</h2>
            <p className="text-gray-700">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
              dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
              der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
              Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind
              nur für den privaten, nicht kommerziellen Gebrauch gestattet.
              <br /><br />
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
              Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
              gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
              bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
              werden wir derartige Inhalte umgehend entfernen.
            </p>
          </section>

          <section className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Quelle: eRecht24
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

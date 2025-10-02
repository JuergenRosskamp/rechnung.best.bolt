import { Shield, ArrowLeft } from 'lucide-react';

export default function DatenschutzPage() {
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
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Datenschutzerklärung</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Datenschutz auf einen Blick</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">Allgemeine Hinweise</h3>
            <p className="text-gray-700">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten
              sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche
              Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
              Datenschutzerklärung.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">Datenerfassung auf dieser Website</h3>
            <p className="text-gray-700 mb-2">
              <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
            </p>
            <p className="text-gray-700 mb-4">
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
              Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>

            <p className="text-gray-700 mb-2">
              <strong>Wie erfassen wir Ihre Daten?</strong>
            </p>
            <p className="text-gray-700 mb-4">
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es
              sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
              <br /><br />
              Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst.
              Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des
              Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website
              betreten.
            </p>

            <p className="text-gray-700 mb-2">
              <strong>Wofür nutzen wir Ihre Daten?</strong>
            </p>
            <p className="text-gray-700 mb-4">
              Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
              gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.
            </p>

            <p className="text-gray-700 mb-2">
              <strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong>
            </p>
            <p className="text-gray-700">
              Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck
              Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die
              Berichtigung oder Löschung dieser Daten zu verlangen. Hierzu sowie zu weiteren Fragen zum
              Thema Datenschutz können Sie sich jederzeit unter der im Impressum angegebenen Adresse an
              uns wenden. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen
              Aufsichtsbehörde zu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Hosting und Content Delivery Networks (CDN)</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Externes Hosting</h3>
            <p className="text-gray-700">
              Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die
              personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des
              Hosters gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und
              Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Webseitenzugriffe und sonstige
              Daten, die über eine Website generiert werden, handeln.
              <br /><br />
              Der Einsatz des Hosters erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren
              potenziellen und bestehenden Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer
              sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots durch einen
              professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO).
              <br /><br />
              Unser Hoster wird Ihre Daten nur insoweit verarbeiten, wie dies zur Erfüllung seiner
              Leistungspflichten erforderlich ist und unsere Weisungen in Bezug auf diese Daten befolgen.
              <br /><br />
              <strong>Hosting-Standort:</strong> Deutschland / EU
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              3. Allgemeine Hinweise und Pflichtinformationen
            </h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Datenschutz</h3>
            <p className="text-gray-700 mb-4">
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir
              behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen
              Datenschutzvorschriften sowie dieser Datenschutzerklärung.
              <br /><br />
              Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben.
              Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können.
              Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie
              nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hinweis zur verantwortlichen Stelle
            </h3>
            <p className="text-gray-700 mb-4">
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
              <br /><br />
              [Firmenname]<br />
              [Straße und Hausnummer]<br />
              [PLZ und Ort]<br />
              <br />
              Telefon: [Telefonnummer]<br />
              E-Mail: [E-Mail-Adresse]
              <br /><br />
              Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder
              gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen
              Daten (z.B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Speicherdauer</h3>
            <p className="text-gray-700 mb-4">
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde,
              verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung
              entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur
              Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich
              zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben (z.B. steuer-
              oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung
              nach Fortfall dieser Gründe.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hinweis zur Datenweitergabe in die USA
            </h3>
            <p className="text-gray-700 mb-4">
              Wir übermitteln grundsätzlich keine Daten in die USA. Sollte dies doch erforderlich sein,
              erfolgt dies nur unter Einhaltung der DSGVO-Vorgaben und entsprechender
              Datenschutzgarantien.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Widerruf Ihrer Einwilligung zur Datenverarbeitung
            </h3>
            <p className="text-gray-700 mb-4">
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich.
              Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der
              bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recht auf Datenübertragbarkeit
            </h3>
            <p className="text-gray-700 mb-4">
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung
              eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen,
              maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte Übertragung der
              Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch
              machbar ist.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">SSL- bzw. TLS-Verschlüsselung</h3>
            <p className="text-gray-700 mb-4">
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher
              Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie an uns als Seitenbetreiber
              senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie
              daran, dass die Adresszeile des Browsers von "http://" auf "https://" wechselt und an dem
              Schloss-Symbol in Ihrer Browserzeile.
              <br /><br />
              Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns
              übermitteln, nicht von Dritten mitgelesen werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Datenerfassung auf dieser Website</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Server-Log-Dateien</h3>
            <p className="text-gray-700 mb-4">
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten
              Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
              <br /><br />
              • Browsertyp und Browserversion<br />
              • verwendetes Betriebssystem<br />
              • Referrer URL<br />
              • Hostname des zugreifenden Rechners<br />
              • Uhrzeit der Serveranfrage<br />
              • IP-Adresse
              <br /><br />
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
              <br /><br />
              Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der
              Websitebetreiber hat ein berechtigtes Interesse an der technisch fehlerfreien Darstellung
              und der Optimierung seiner Website – hierzu müssen die Server-Log-Files erfasst werden.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kontaktformular</h3>
            <p className="text-gray-700 mb-4">
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem
              Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung
              der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben
              wir nicht ohne Ihre Einwilligung weiter.
              <br /><br />
              Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern
              Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung
              vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die
              Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns
              gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6 Abs.
              1 lit. a DSGVO) sofern diese abgefragt wurde.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Registrierung auf dieser Website</h3>
            <p className="text-gray-700">
              Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen auf der Seite
              zu nutzen. Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des
              jeweiligen Angebotes oder Dienstes, für den Sie sich registriert haben. Die bei der
              Registrierung abgefragten Pflichtangaben müssen vollständig angegeben werden. Anderenfalls
              werden wir die Registrierung ablehnen.
              <br /><br />
              Für wichtige Änderungen etwa beim Angebotsumfang oder bei technisch notwendigen Änderungen
              nutzen wir die bei der Registrierung angegebene E-Mail-Adresse, um Sie auf diesem Wege zu
              informieren.
              <br /><br />
              Die Verarbeitung der bei der Registrierung eingegebenen Daten erfolgt zum Zwecke der
              Durchführung des durch die Registrierung begründeten Nutzungsverhältnisses und ggf. zur
              Anbahnung weiterer Verträge (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Ihre Rechte</h2>
            <p className="text-gray-700 space-y-4">
              <strong>Auskunft, Löschung und Berichtigung:</strong><br />
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf
              unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und
              Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder
              Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten
              können Sie sich jederzeit an uns wenden.
              <br /><br />
              <strong>Recht auf Einschränkung der Verarbeitung:</strong><br />
              Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
              verlangen. Hierzu können Sie sich jederzeit an uns wenden.
              <br /><br />
              <strong>Recht auf Widerspruch:</strong><br />
              Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit
              gegen die Verarbeitung Sie betreffender personenbezogener Daten Widerspruch einzulegen.
              <br /><br />
              <strong>Beschwerderecht bei der zuständigen Aufsichtsbehörde:</strong><br />
              Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer
              Aufsichtsbehörde zu.
            </p>
          </section>

          <section className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Stand: Januar 2025<br />
              Quelle: eRecht24
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

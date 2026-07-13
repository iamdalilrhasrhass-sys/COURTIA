import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalConfidentialite() {
  useEffect(() => {
    applySeo({
      title: 'Politique de confidentialité — COURTIA',
      description: 'Politique de confidentialité de COURTIA.',
      canonicalPath: '/legal/confidentialite',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Politique de confidentialité</h1>
        <div className="mk-card">
          <p>Dernière mise à jour : 12 juillet 2026.</p>
          <p>
            Courtiark collecte les données strictement nécessaires au fonctionnement de la plateforme et aux demandes de démo B2B.
          </p>
          <p>
            Finalités principales: gestion de la relation client cabinet, suivi des tâches, pilotage portefeuille, assistance ARK et support utilisateur.
          </p>
          <p>
            Une demande de démo déclenche uniquement le contact nécessaire pour traiter cette demande. L\'inscription aux e-mails de nouveautés et d\'invitations repose sur un consentement séparé, facultatif, non pré-coché et révocable gratuitement à tout moment.
          </p>
          <p>
            Données collectées sur le formulaire démo : identité et coordonnées professionnelles, informations cabinet, message libre, marché choisi, source de la demande, version du texte de consentement et date du consentement.
          </p>
          <p>
            Les données ne sont pas revendues à des tiers. Une demande de démo sans relation contractuelle est conservée au maximum 12 mois après le dernier échange, sauf opposition ou obligation légale contraire. La preuve d\'un consentement retiré peut être conservée dans une liste de suppression afin d\'éviter toute nouvelle sollicitation.
          </p>
          <p>
            Intégrations (Google Agenda, WhatsApp Business, Gmail/Outlook): activées uniquement sur action explicite du cabinet. Les tokens restent côté backend.
          </p>
          <p>
            Sous-traitants techniques: hébergement web/app et services d&apos;infrastructure nécessaires à l&apos;exploitation de COURTIA.
          </p>
          <p>
            Les durées de conservation dépendent de la relation contractuelle, des obligations légales du cabinet et des demandes
            d&apos;effacement recevables. Les sauvegardes techniques sont restaurées selon le runbook incident.
          </p>
          <p>
            Vous pouvez demander export, rectification, limitation ou suppression de vos données selon les cas applicables.
          </p>
          <p>
            Pour la Suisse, l\'adresse professionnelle publiée d\'un tiers n\'est jamais traitée comme un consentement à recevoir une campagne e-mail. Toute demande d\'accès, correction, retrait du consentement ou suppression peut être adressée à arkcourtia@gmail.com.
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}

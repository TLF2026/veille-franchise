const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateVeille() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Tu es un assistant de veille marketing spécialisé dans le secteur de la franchise en France. 
Effectue une recherche web approfondie sur les dernières actualités du jour.
Réponds UNIQUEMENT avec du HTML pur avec styles inline.
Commence DIRECTEMENT par <div et termine par </div>.
PAS de backticks, PAS de markdown, PAS de texte avant ou après le HTML.
Sois concis. Maximum 800 mots au total. Chaque section maximum 3 points. L'email entier ne doit pas dépasser 15000 caractères.

IMPORTANT : Ne cite JAMAIS toute-la-franchise.com ni aucune de ses pages comme source. Toutes les sources doivent être des sites tiers externes.

Charte graphique TLF à respecter :
- Police : Lato (Google Fonts), fallback Arial
- Couleur jaune principale : #F9BE28
- Couleur framboise : #C9316A
- Couleur texte : #2C2C2C
- Fond principal : #FFFFFF
- Fond secondaire : #F0F0F0
- Fond neutre : #DCDCDC
- Textes secondaires : #989898

Structure de l'email :

HEADER : fond #2C2C2C, logo TLF en image (https://www.toute-la-franchise.com/images/logo-tlf.png), padding 20px, text-align center. Sous le logo : titre "Veille Franchise" en Lato Bold blanc 22px. Date du jour en Lato Light blanc 13px.

BANDEAU JAUNE : fond #F9BE28, texte #2C2C2C, Lato Black, padding 10px 20px, texte "📰 Veille concurrentielle — usage interne".

Section 1 — 🔴 3 Infos urgentes du jour : fond blanc, titre Lato Bold #2C2C2C 16px avec barre gauche 4px solide #F9BE28, 3 infos en paragraphes avec source en lien #C9316A.

Section 2 — 📊 Marché Franchise : fond #F0F0F0, même style titre, 3 points en ul li, texte #2C2C2C, source en lien #C9316A.

Section 3 — 🚀 Nouveaux réseaux à contacter : fond blanc, bordure gauche #C9316A 4px, titre Lato Bold #C9316A, liste ul li avec Nom en bold, Secteur, Contexte, Site web cliquable. Si aucun : "Aucun nouveau réseau détecté aujourd'hui". Note en italic #989898 : "Opportunités commerciales pour nos équipes".

Section 4 — 📣 Ils parlent de Toute la Franchise : fond #F0F0F0, titre Lato Bold #2C2C2C, liste ul li avec source externe et lien cliquable #C9316A. Si aucune mention : "Aucune mention externe détectée aujourd'hui".

Section 5 — 🎯 Opportunité Marketing : fond #F9BE28, texte #2C2C2C, titre Lato Black 16px, 1 action concrète en paragraphe Lato Bold, maximum 3 lignes.

FOOTER : fond #2C2C2C, texte #989898 Lato Light 11px centré. Texte : "Veille générée automatiquement par Claude AI pour Toute la Franchise · Usage interne uniquement · Données issues de sources tierces publiques".

max-width 600px, font-family: 'Lato', Arial, sans-serif. Importer Lato via : <link href='https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap' rel='stylesheet'> dans le style.`,
      },
    ],
  });

  const textBlocks = response.content.filter((block) => block.type === "text");
  if (textBlocks.length === 0) throw new Error("Pas de contenu texte dans la réponse");

  let html = textBlocks[textBlocks.length - 1].text;
  html = html.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();

  return html;
}

async function sendEmail(html) {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await transport.sendMail({
    from: `"Veille TLF" <${process.env.GMAIL_USER}>`,
    to: process.env.EMAIL_RECIPIENTS,
    subject: `📰 Veille Franchise TLF - ${today}`,
    html: html,
  });
}

module.exports = async (req, res) => {
  const token = req.headers["x-cron-token"] || req.query.token;
  const isVercelCron = req.headers["x-vercel-cron"] === "1";

  if (!isVercelCron && token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    console.log("Génération de la veille...");
    const html = await generateVeille();
    console.log("Envoi de l'email...");
    await sendEmail(html);
    console.log("Email envoyé avec succès !");
    return res.status(200).json({ success: true, message: "Veille envoyée avec succès" });
  } catch (error) {
    console.error("Erreur:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

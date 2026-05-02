const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateVeille() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Tu es un assistant de veille marketing spécialisé dans le secteur de la franchise en France. 
Effectue une recherche web approfondie sur les dernières actualités du jour.
Réponds UNIQUEMENT avec du HTML pur avec styles inline.
Commence DIRECTEMENT par <div et termine par </div>.
PAS de backticks, PAS de markdown, PAS de texte avant ou après le HTML.

Structure requise :
1. Header avec fond #FF6600, titre Veille Franchise du jour, sous-titre Par Toute la Franchise avec la date du jour
2. Section 3 Infos urgentes du jour avec 3 actualités importantes et sources cliquables
3. Section Marché Franchise avec 3 à 5 tendances et sources cliquables
4. Section Nouveaux réseaux à contacter avec réseaux qui se lancent ou relancent en franchise, nom secteur contexte site web
5. Section Ils parlent de Toute la Franchise avec mentions dans médias blogs réseaux
6. Section Opportunité Marketing avec 1 action concrète recommandée
7. Footer gris avec mention Veille générée par Claude AI pour Toute la Franchise

Couleurs : principal #FF6600, secondaire #1a2942, fonds alternés #f8f9fa et #fff3e8.
max-width 600px, font-family Arial sans-serif, styles inline sur chaque élément.`,
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
    subject: `Veille Franchise - ${today}`,
    html: html,
  });
}

module.exports = async (req, res) => {
  const token = req.headers["x-cron-token"] || req.query.token;
  if (token !== process.env.CRON_SECRET) {
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

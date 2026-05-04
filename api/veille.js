const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateVeille() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Fais une recherche web sur les actualités franchise France du jour. Génère un email HTML inline styles, max 8000 caractères total. Commence par <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;"> et termine par </div>. PAS de backticks.

IMPORTANT : jamais toute-la-franchise.com comme source.

Structure COURTE :

1. HEADER fond #2C2C2C padding 20px text-align center : img src="https://www.toute-la-franchise.com/images/logo-tlf.png" height=50 + titre "Veille Franchise" color blanc Lato Bold 20px + date du jour color #989898 12px.

2. BANDEAU fond #F9BE28 padding 8px 20px : texte "📰 Veille concurrentielle — usage interne" color #2C2C2C bold 12px.

3. Section "🔴 Infos du jour" fond blanc padding 16px 20px : titre bold #2C2C2C border-left 4px solid #F9BE28 padding-left 10px. MAX 3 infos courtes en p avec lien source color #C9316A.

4. Section "🚀 Nouveaux réseaux" fond #F0F0F0 padding 16px 20px : titre bold #C9316A. MAX 3 réseaux en ul li format "Nom — Secteur — Contexte" avec lien. Si aucun : "Aucun détecté aujourd'hui".

5. Section "🎯 Opportunité" fond #F9BE28 padding 16px 20px : titre Lato Black #2C2C2C. 2 lignes max d'action concrète.

6. FOOTER fond #2C2C2C padding 12px text-align center : "Veille Claude AI pour Toute la Franchise · Usage interne" color #989898 10px.`,
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

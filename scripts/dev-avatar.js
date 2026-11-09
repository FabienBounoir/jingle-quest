// Dev uniquement : pose une photo de profil sur un compte (le mock OIDC n'en fournit pas).
// Usage : node --env-file=.env scripts/dev-avatar.js ma-photo.jpg moi@exemple.com
import sharp from 'sharp';
import postgres from 'postgres';

const [file, email] = process.argv.slice(2);
if (!file || !email) throw new Error('Usage : node --env-file=.env scripts/dev-avatar.js <image> <email>');
const sql = postgres(process.env.DATABASE_URL);
const img = await sharp(file).resize(96, 96, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
const r = await sql`update users set avatar = ${img}, avatar_hidden = false where email = ${email.toLowerCase()}`;
console.log(`${r.count} compte(s) mis à jour`);
await sql.end();

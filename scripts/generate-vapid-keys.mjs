import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('Add these to your environment:\n')
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('VAPID_SUBJECT=mailto:your@email.com')
console.log('\nPublic key → .env.local (frontend)')
console.log('Private key + subject → Supabase Edge Function secrets')

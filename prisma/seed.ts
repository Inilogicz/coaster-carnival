import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { defaultContent } from '../src/lib/content';

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.admin.upsert({ where: { email }, update: {}, create: { email, passwordHash } });
    console.log(`Admin ready: ${email}`);
  } else if (!(await db.admin.count())) {
    console.warn('No admin created. Set ADMIN_EMAIL and ADMIN_PASSWORD, then run `npm run db:seed` again.');
  }

  if (await db.event.count()) {
    console.log('Events already exist; leaving them untouched.');
    return;
  }

  await db.event.create({
    data: {
      slug: 'coastal-carnival-4',
      isActive: true,
      bookingOpen: true,
      name: 'Coastal Carnival 4.0',
      host: 'The Wildings Hub',
      theme: 'Rhythm of the Coast',
      date: '2026-12-19',
      startTime: '3pm',
      timeLabel: '3pm till dawn',
      city: 'Lagos',
      location: 'Lagos, Nigeria',
      takeOffPoint: 'Ikeja City Mall',
      destination: 'Island, Lagos',
      capacity: 200,
      currency: 'NGN',
      contactPhone: '+234 905 487 1652',
      refundPolicy: 'No refunds.',
      content: defaultContent,
      ticketTypes: {
        create: [{ name: 'Regular', description: 'Includes transport to the event and back, food, drinks and activities.', price: 50_000_00, sortOrder: 0 }],
      },
      tribes: {
        create: [
          { position: 0, element: 'Fire', name: 'Hot', colorName: 'Red', colorHex: '#B42150', tagline: 'Turn up the heat.', image: '/assets/coast-1.png', capacity: 50 },
          { position: 1, element: 'Air', name: 'Spicy', colorName: 'Yellow', colorHex: '#FBD839', tagline: 'Bring a little extra.', image: '/assets/coast-3.png', capacity: 50 },
          { position: 2, element: 'Water', name: 'Drip', colorName: 'Blue', colorHex: '#0684E5', tagline: 'Make waves. Serve looks.', image: '/assets/coast-4.png', capacity: 50 },
          { position: 3, element: 'Earth', name: 'Wild', colorName: 'Green', colorHex: '#6F915F', tagline: 'Let your wild side out.', image: '/assets/people-2.png', capacity: 50 },
        ],
      },
    },
  });
  console.log('Seeded Coastal Carnival 4.0 as the active event.');
}

main().finally(() => db.$disconnect());

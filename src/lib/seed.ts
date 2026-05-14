import { doc, getDoc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { db, auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const categories = ['Meals', 'Snacks', 'Drinks', 'Beverages'];

const initialItems = [
  { name: 'Veg Thali', category: 'Meals', price: 80, available: true },
  { name: 'Chicken Thali', category: 'Meals', price: 120, available: true },
  { name: 'Dal Rice', category: 'Meals', price: 60, available: true },
  { name: 'Rajma Chawal', category: 'Meals', price: 70, available: true },
  { name: 'Samosa 2pc', category: 'Snacks', price: 20, available: true },
  { name: 'Bread Pakoda', category: 'Snacks', price: 30, available: true },
  { name: 'Veg Puff', category: 'Snacks', price: 25, available: true },
  { name: 'Poha', category: 'Snacks', price: 40, available: true },
  { name: 'Chai', category: 'Drinks', price: 10, available: true },
  { name: 'Coffee', category: 'Drinks', price: 20, available: true },
  { name: 'Lassi', category: 'Beverages', price: 40, available: true },
  { name: 'Cold Coffee', category: 'Beverages', price: 50, available: true },
];

const initialBanners = [
  { title: "Combo Offer", description: "Buy 1 Snack, Get 1 Chai Free!", active: true },
  { title: "Lunch Special", description: "10% off on Veg Thali between 1 PM and 3 PM", active: true },
  { title: "Weekend Fiesta", description: "Try our new desserts!", active: false },
];

const initialCategories = [
  { name: 'Meals', description: 'Full course meals', displayOrder: 1, active: true },
  { name: 'Snacks', description: 'Quick bites', displayOrder: 2, active: true },
  { name: 'Drinks', description: 'Hot and cold drinks', displayOrder: 3, active: true },
  { name: 'Beverages', description: 'Packaged beverages', displayOrder: 4, active: true },
];

export async function seedDatabase() {
  try {
    const isSeededSnapshot = await getDoc(doc(db, 'system', 'seed2'));
    if (isSeededSnapshot.exists() && isSeededSnapshot.data().seeded) {
      console.log('Already seeded');
      alert('Database is already seeded!');
      return;
    }

    // Try to create accounts using Auth
    try {
      const studentCred = await createUserWithEmailAndPassword(auth, 'student@demo.com', 'demo123');
      await setDoc(doc(db, 'users', studentCred.user.uid), {
        email: 'student@demo.com',
        name: 'Demo Student',
        role: 'student',
        createdAt: Date.now()
      });
      console.log('Student created');
    } catch(e: any) {
      console.log('Student creation failed:', e.message);
      if (e.code === 'auth/operation-not-allowed') {
        alert('Email/Password Auth is not enabled in Firebase. Please enable it in the console.');
        throw e;
      }
    }

    try {
      const managerCred = await createUserWithEmailAndPassword(auth, 'manager@demo.com', 'demo123');
      await setDoc(doc(db, 'users', managerCred.user.uid), {
        email: 'manager@demo.com',
        name: 'Demo Manager',
        role: 'manager',
        createdAt: Date.now()
      });
      console.log('Manager created');
    } catch(e: any) {
      console.log('Manager creation failed:', e.message);
      if (e.code === 'auth/email-already-in-use') {
        await signInWithEmailAndPassword(auth, 'manager@demo.com', 'demo123');
        console.log('Manager signed in successfully.');
      } else {
        throw e;
      }
    }

    const batch = writeBatch(db);

    // Items
    for (const item of initialItems) {
      const itemRef = doc(collection(db, 'items'));
      batch.set(itemRef, {
        ...item,
        description: 'Delicious ' + item.name,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
        orderCount: 0
      });
    }

    // Tables
    for (let i = 1; i <= 5; i++) {
        const tableRef = doc(collection(db, 'tables'));
        batch.set(tableRef, {
            name: `Table ${i}`,
            active: true
        });
    }

    // Banners
    for (const banner of initialBanners) {
        const bannerRef = doc(collection(db, 'banners'));
        batch.set(bannerRef, {
            ...banner,
            imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
            validTill: Date.now() + 86400 * 1000 * 30, // 30 days
            clickCount: 0,
            createdAt: Date.now()
        });
    }

    // Categories
    for (const cat of initialCategories) {
        const catRef = doc(collection(db, 'categories'));
        batch.set(catRef, {
            ...cat,
            imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'
        });
    }

    // Canteen Settings
    batch.set(doc(db, 'settings', 'canteen'), {
      openTime: '09:00',
      closeTime: '22:00',
      activeDays: {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false
      }
    });

    // Record seed
    batch.set(doc(db, 'system', 'seed2'), { seeded: true });
    
    await batch.commit();

    console.log('Seed complete. You can now login.');
    alert('Seed Data Loaded Successfully!');
  } catch (err: any) {
    console.error('Seed error:', err);
    if (err.message && err.message.includes('Missing or insufficient permissions')) {
       alert('Firestore permissions error: ' + err.message + '\nPlease check console output or deploy rules.');
    }
  }
}

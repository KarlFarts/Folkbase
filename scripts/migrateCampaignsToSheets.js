#!/usr/bin/env node
/* eslint-disable no-console */
/* global process */

/**
 * Migration Script: Firestore → Google Sheets
 *
 * Migrates workspace data from Firestore to Google Sheets for 100% free architecture.
 *
 * What this script does:
 * 1. Reads all workspaces from Firestore 'campaigns' collection
 * 2. Reads all workspace members from Firestore 'campaign_members' collection
 * 3. Reads all contact links from Firestore 'contact_links' collection
 * 4. Reads all sync conflicts from Firestore 'sync_conflicts' collection
 * 5. Writes everything to Google Sheets (Workspaces, Workspace Members, Contact Links, Sync Conflicts tabs)
 *
 * Prerequisites:
 * - Firebase project with Firestore data
 * - Google Sheet with 4 tabs: Campaigns, Campaign Members, Contact Links, Sync Conflicts
 * - Valid Google OAuth access token
 * - Environment variables configured (.env file)
 *
 * Usage:
 *   node scripts/migrateCampaignsToSheets.js
 *
 * Environment Variables Required:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *   VITE_GOOGLE_SHEETS_ID
 *   GOOGLE_ACCESS_TOKEN (temporary - get from browser localStorage after signing in)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Google Sheets configuration
const SHEET_ID = process.env.VITE_GOOGLE_SHEETS_ID;
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;

// Sheet names
const SHEET_NAMES = {
  WORKSPACES: 'Workspaces',
  WORKSPACE_MEMBERS: 'Workspace Members',
  CONTACT_LINKS: 'Contact Links',
  SYNC_CONFLICTS: 'Sync Conflicts',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Append rows to a Google Sheet
 */
async function appendToSheet(sheetName, rows) {
  if (rows.length === 0) {
    console.log(`  ⏭️  No data to migrate for ${sheetName}`);
    return;
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}:append`;

    await axios.post(
      url,
      {
        values: rows,
      },
      {
        params: {
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
        },
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`  ✅ Migrated ${rows.length} rows to ${sheetName}`);
  } catch (error) {
    console.error(`  ❌ Error migrating to ${sheetName}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Migrate campaigns
 */
async function migrateWorkspaces() {
  console.log('\n📦 Migrating Workspaces...');

  const snapshot = await getDocs(collection(db, 'campaigns'));
  const rows = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    rows.push([
      doc.id,
      data.name || '',
      data.parent_workspace_id || '',
      data.path || '',
      data.sheet_id || '',
      data.created_at?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
      data.created_by || '',
      data.status || 'active',
      data.description || '',
    ]);
  });

  await appendToSheet(SHEET_NAMES.WORKSPACES, rows);
  return rows.length;
}

/**
 * Migrate campaign members
 */
async function migrateWorkspaceMembers() {
  console.log('\n👥 Migrating Workspace Members...');

  const snapshot = await getDocs(collection(db, 'campaign_members'));
  const rows = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    rows.push([
      doc.id,
      data.workspace_id || '',
      data.member_email || '',
      data.role || 'viewer',
      data.added_date?.toDate?.()?.toISOString() || data.added_date || new Date().toISOString(),
      data.added_by || '',
    ]);
  });

  await appendToSheet(SHEET_NAMES.WORKSPACE_MEMBERS, rows);
  return rows.length;
}

/**
 * Migrate contact links
 */
async function migrateContactLinks() {
  console.log('\n🔗 Migrating Contact Links...');

  const snapshot = await getDocs(collection(db, 'contact_links'));
  const rows = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    rows.push([
      doc.id,
      data.source_sheet_id || '',
      data.source_contact_id || '',
      data.target_sheet_id || '',
      data.target_contact_id || '',
      data.sync_strategy || 'core_fields_only',
      data.last_synced_at?.toDate?.()?.toISOString() ||
        data.last_synced_at ||
        new Date().toISOString(),
      data.linked_at?.toDate?.()?.toISOString() || data.linked_at || new Date().toISOString(),
    ]);
  });

  await appendToSheet(SHEET_NAMES.CONTACT_LINKS, rows);
  return rows.length;
}

/**
 * Migrate sync conflicts
 */
async function migrateSyncConflicts() {
  console.log('\n⚠️  Migrating Sync Conflicts...');

  const snapshot = await getDocs(collection(db, 'sync_conflicts'));
  const rows = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    rows.push([
      doc.id,
      data.link_id || '',
      data.field_name || '',
      data.source_value || '',
      data.target_value || '',
      data.resolution || 'pending',
      data.resolved_at?.toDate?.()?.toISOString() || data.resolved_at || '',
      data.resolved_by || '',
    ]);
  });

  await appendToSheet(SHEET_NAMES.SYNC_CONFLICTS, rows);
  return rows.length;
}

/**
 * Validate environment and prerequisites
 */
function validateEnvironment() {
  console.log('🔍 Validating environment...');

  const missing = [];

  if (!process.env.VITE_FIREBASE_API_KEY) missing.push('VITE_FIREBASE_API_KEY');
  if (!process.env.VITE_FIREBASE_AUTH_DOMAIN) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!process.env.VITE_FIREBASE_PROJECT_ID) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!SHEET_ID) missing.push('VITE_GOOGLE_SHEETS_ID');
  if (!ACCESS_TOKEN) missing.push('GOOGLE_ACCESS_TOKEN');

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nPlease set these in your .env file or environment.\n');
    console.error('To get GOOGLE_ACCESS_TOKEN:');
    console.error('  1. Sign in to your app in the browser');
    console.error('  2. Open DevTools > Application > Local Storage');
    console.error('  3. Copy the value of "googleAccessToken"');
    console.error('  4. Set it as GOOGLE_ACCESS_TOKEN in .env\n');
    process.exit(1);
  }

  console.log('  ✅ All environment variables present\n');
}

/**
 * Main migration function
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  Touchpoint CRM: Firestore → Sheets Migration   ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  validateEnvironment();

  try {
    const stats = {
      workspaces: 0,
      members: 0,
      links: 0,
      conflicts: 0,
    };

    console.log('🚀 Starting migration...\n');

    // Migrate each collection
    stats.workspaces = await migrateWorkspaces();
    stats.members = await migrateWorkspaceMembers();
    stats.links = await migrateContactLinks();
    stats.conflicts = await migrateSyncConflicts();

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║              Migration Complete! ✨               ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    console.log('📊 Summary:');
    console.log(`   Workspaces:       ${stats.workspaces}`);
    console.log(`   Members:          ${stats.members}`);
    console.log(`   Contact Links:    ${stats.links}`);
    console.log(`   Sync Conflicts:   ${stats.conflicts}`);
    console.log(`   ────────────────────────────`);
    console.log(
      `   Total Records:    ${stats.workspaces + stats.members + stats.links + stats.conflicts}\n`
    );

    console.log('🎉 Your workspace data has been successfully migrated to Google Sheets!');
    console.log('   You can now use Touchpoint CRM with 100% free architecture.\n');
    console.log('📝 Next steps:');
    console.log('   1. Verify data in your Google Sheet');
    console.log('   2. Update your app to use the new Sheets-based services');
    console.log('   3. Test workspace creation and management');
    console.log('   4. (Optional) Archive or delete Firestore data\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('  - Your Google Sheet has the correct tabs');
    console.error('  - Your access token is valid (not expired)');
    console.error('  - You have write access to the Google Sheet\n');
    process.exit(1);
  }
}

// Run migration
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

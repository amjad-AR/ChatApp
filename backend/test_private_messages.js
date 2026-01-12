// test_private_messages.js - Simple test script for private messaging feature
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser1 = {
  name: 'Alice',
  email: 'alice@test.com',
  password: 'password123'
};

const testUser2 = {
  name: 'Bob',
  email: 'bob@test.com',
  password: 'password123'
};

let user1Token = '';
let user2Token = '';
let user1Id = '';
let user2Id = '';

async function runTests() {
  try {
    console.log('🚀 Starting Private Messaging Tests...\n');

    // Test 1: Register two test users
    console.log('1. Registering test users...');
    try {
      const user1Response = await axios.post(`${BASE_URL}/auth/register`, testUser1);
      const user2Response = await axios.post(`${BASE_URL}/auth/register`, testUser2);
      console.log('✅ Users registered successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️  Users already exist, continuing...');
      } else {
        throw error;
      }
    }

    // Test 2: Login both users
    console.log('\n2. Logging in users...');
    const login1Response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser1.email,
      password: testUser1.password
    });
    const login2Response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser2.email,
      password: testUser2.password
    });

    user1Token = login1Response.data.token;
    user2Token = login2Response.data.token;
    user1Id = login1Response.data.user._id;
    user2Id = login2Response.data.user._id;
    
    console.log('✅ Users logged in successfully');
    console.log(`   Alice ID: ${user1Id}`);
    console.log(`   Bob ID: ${user2Id}`);

    // Test 3: Get users for messaging (Alice's perspective)
    console.log('\n3. Getting users for messaging...');
    const contactsResponse = await axios.get(`${BASE_URL}/users/contacts`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Users for messaging retrieved successfully');
    console.log(`   Found ${contactsResponse.data.count} users`);

    // Test 4: Send private message from Alice to Bob
    console.log('\n4. Sending private message from Alice to Bob...');
    const messageResponse = await axios.post(`${BASE_URL}/messages/private`, {
      text: 'Hello Bob! This is a private message from Alice.',
      receiver_id: user2Id
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Private message sent successfully');
    console.log(`   Message ID: ${messageResponse.data._id}`);

    // Test 5: Get private messages between Alice and Bob (Alice's perspective)
    console.log('\n5. Getting private messages between Alice and Bob...');
    const messagesResponse = await axios.get(`${BASE_URL}/messages/private/${user2Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Private messages retrieved successfully');
    console.log(`   Found ${messagesResponse.data.length} messages`);
    if (messagesResponse.data.length > 0) {
      console.log(`   Latest message: "${messagesResponse.data[messagesResponse.data.length - 1].text}"`);
    }

    // Test 6: Send reply from Bob to Alice
    console.log('\n6. Sending reply from Bob to Alice...');
    const replyResponse = await axios.post(`${BASE_URL}/messages/private`, {
      text: 'Hi Alice! Thanks for your message. This is Bob replying.',
      receiver_id: user1Id
    }, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    console.log('✅ Reply sent successfully');

    // Test 7: Get conversations (Alice's perspective)
    console.log('\n7. Getting Alice\'s conversations...');
    const conversationsResponse = await axios.get(`${BASE_URL}/messages/private/conversations`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Conversations retrieved successfully');
    console.log(`   Found ${conversationsResponse.data.length} conversations`);
    if (conversationsResponse.data.length > 0) {
      console.log(`   Latest conversation with: ${conversationsResponse.data[0].user.name}`);
    }

    // Test 8: Test public hall messages still work
    console.log('\n8. Testing public hall messages...');
    const hallMessageResponse = await axios.post(`${BASE_URL}/messages/hall`, {
      text: 'This is a public message in the hall from Alice.'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Public hall message sent successfully');

    const hallMessagesResponse = await axios.get(`${BASE_URL}/messages/hall`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Public hall messages retrieved successfully');
    console.log(`   Found ${hallMessagesResponse.data.length} public messages`);

    console.log('\n🎉 All tests passed! Private messaging feature is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

// Run the tests
runTests();
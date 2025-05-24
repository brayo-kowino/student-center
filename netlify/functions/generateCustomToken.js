const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const uid = body.uid;
    const email = body.email;

    // Optional: check if the user exists, or create if needed
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (err) {
      // User not found, create one
      userRecord = await admin.auth().createUser({
        uid: uid,
        email: email || undefined,
      });
    }

    const customToken = await admin.auth().createCustomToken(uid);

    return {
      statusCode: 200,
      body: JSON.stringify({ customToken }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate token" }),
    };
  }
};

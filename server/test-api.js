const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.EXERCISEDB_API_KEY;
if (!apiKey) {
  console.error("No API key");
  process.exit(1);
}

async function testV2() {
  const response = await fetch('https://exercisedb.p.rapidapi.com/exercises?limit=1&offset=0', {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
      'Accept': 'application/json'
    }
  });
  const data = await response.json();
  console.log("V2 RapidAPI response:", JSON.stringify(data[0], null, 2));
}

testV2().catch(console.error);

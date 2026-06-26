import 'dotenv/config';

async function test() {
  const { address } = await require('dns').promises.lookup('smtp.gmail.com', { family: 4 });
  console.log(address);
}

test();

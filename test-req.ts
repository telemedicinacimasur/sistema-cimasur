import 'dotenv/config';
const { address } = await require('dns').promises.lookup('smtp.gmail.com', { family: 4 });
console.log(address);

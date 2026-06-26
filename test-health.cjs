async function test() {
  const res = await fetch('http://localhost:3000/api/health');
  console.log(await res.text());
}
test();

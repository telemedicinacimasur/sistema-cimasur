const vals = [2, 25, 2, 4, 2, 2, 120, 6, 3, 3, 1, 2];
let sum = 0;
for (const val of vals) {
  let num = 0;
  if (typeof val === 'number') num = val;
  else if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleaned) || 0;
  }
  sum += num;
}
console.log(sum);

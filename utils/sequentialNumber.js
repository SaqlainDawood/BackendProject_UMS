export function parseSequentialNumber(str) {
  if (typeof str !== 'string') {
    throw new Error('Sequential number must be a string.');
  }

  const match = str.match(/^(.*?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid sequential number "${str}". It must end with digits.`);
  }

  const prefix = match[1];
  const numberPart = match[2];

  return {
    prefix,
    numberPart,
    width: numberPart.length,
  };
}

export function incrementSequentialNumber(str, step = 1) {
  if (!Number.isInteger(step)) {
    throw new Error('Step must be an integer value.');
  }

  const { prefix, numberPart, width } = parseSequentialNumber(str);
  const current = BigInt(numberPart);
  const next = current + BigInt(step);
  return `${prefix}${next.toString().padStart(width, '0')}`;
}

export function generateRegistrationNumbers(start, count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Count must be a non-negative integer.');
  }

  const values = [];
  const startValue = parseSequentialNumber(start);
  let current = BigInt(startValue.numberPart);

  for (let i = 0; i < count; i += 1) {
    const value = current + BigInt(i);
    values.push(`${startValue.prefix}${value.toString().padStart(startValue.width, '0')}`);
  }

  return values;
}

export function generateRollNumbers(start, count) {
  return generateRegistrationNumbers(start, count);
}

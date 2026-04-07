import { nanoid } from 'nanoid';

const key = `rev_${nanoid(22)}`;
const service = process.argv[2] || 'ENDPOINT';
console.log(`INTERNAL_API_KEY_${service.toUpperCase()}=${key}`);

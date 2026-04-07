import { nanoid } from 'nanoid';

const key = `rev_${nanoid(22)}`;
console.log(`INTERNAL_API_KEY=${key}`);

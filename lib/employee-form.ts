import {z} from 'zod';
const requiredText=z.string().trim().min(1,'This field is required.');
const phone=requiredText.regex(/^\+?[0-9 ()-]{7,20}$/,'Enter a valid phone number.');
const date=requiredText.regex(/^\d{4}-\d{2}-\d{2}$/,'Enter a valid date.').refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Enter a valid date.');
const time=requiredText.regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Enter a valid shift time.');
export const employeeFormSchema=z.object({
 employee_id:requiredText,
 full_name:requiredText,
 mobile:phone,
 emergency_phone:phone,
 email:z.union([z.literal(''),z.string().trim().email('Enter a valid email address.')]).optional().transform(v=>v||null),
 gender:requiredText,
 date_of_birth:date,
 department:requiredText,
 designation:requiredText,
 date_of_joining:date,
 shift_start:time,
 shift_end:time,
 standard_hours:z.coerce.number().positive('Total hours must be greater than zero.').max(24,'Total hours cannot exceed 24.'),
});

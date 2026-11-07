export type Photo = { id:string; url:string; is_cover:boolean }
export type Memory = { id:string; title:string; description:string; memory_date:string; is_anniversary:boolean; photos:Photo[]; experience_id:string|null; created_at:string }
export type Experience = { id:string; title:string; category:string; source_url:string; description:string; status:'wish'|'planned'|'done'; planned_at:string|null; location:string; created_at:string }
export type Feedback = { id:string; feedback_date:string; roberto_text:string; tamiris_text:string; memory_ids:string[]; experience_ids:string[]; created_at:string }

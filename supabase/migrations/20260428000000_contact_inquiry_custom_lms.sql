-- Add 'custom_lms' to the allowed values for contact_inquiries.inquiry_type.

alter table public.contact_inquiries
  drop constraint if exists contact_inquiries_inquiry_type_check;

alter table public.contact_inquiries
  add constraint contact_inquiries_inquiry_type_check
  check (
    inquiry_type in (
      'sales',
      'licensing',
      'custom_lms',
      'feature_request',
      'bug_report',
      'other'
    )
  );

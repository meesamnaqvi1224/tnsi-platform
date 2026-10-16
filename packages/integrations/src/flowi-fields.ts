/**
 * IDs of the TNSI custom fields in the Flowi (GoHighLevel) account, read from the
 * real account on 2026-10-16 (folder "TNSI Website"). They are configuration of
 * THAT account, not secrets. If a field is recreated in Flowi its ID changes and
 * this file must be updated; the keys are listed for reference only.
 */
export const FLOWI_FIELD = {
  contactMessage: { id: '5rhhRA8WW0QchEig0C7b', key: 'contact.tnsi_contact_message' },
  contactSubject: { id: '9VxjayX7wjPCtuE16NIc', key: 'contact.tnsi_contact_subject' },
  contactOrganisation: { id: 'yNXiyn0sr8iPuHzeHEmP', key: 'contact.tnsi_contact_organisation' },
  assessmentResult: { id: 'qeHBBbCSL5c3ByND5IlI', key: 'contact.tnsi_assessment_result' },
  marketingConsent: { id: 'gzAiyW5VjARV0HWt5t8c', key: 'contact.tnsi_marketing_consent' },
  membershipState: { id: 'IF0pqQ6UzVlddYuRHP2P', key: 'contact.tnsi_membership_state' },
  plan: { id: 'pcqnekNeL6QXY2RFcR3a', key: 'contact.tnsi_plan' },
  trialEnds: { id: 'brGPTlUTDnpOKaFYfXgp', key: 'contact.tnsi_trial_ends' },
  paidThrough: { id: 'HSrSX4u3UPxQpo4Hfn9g', key: 'contact.tnsi_paid_through' },
} as const;

/**
 * Country list for the delivery address.
 *
 * Only the ISO 3166-1 alpha-2 codes are stored; the display names come from
 * the browser's own Intl data. That keeps the bundle tiny and means the list
 * is always spelled the way the visitor's locale expects.
 */

const CODES = [
  'AD','AE','AF','AG','AL','AM','AO','AR','AT','AU','AW','AZ','BA','BB','BD','BE','BF','BG','BH',
  'BI','BJ','BN','BO','BR','BS','BT','BW','BY','BZ','CA','CD','CF','CG','CH','CI','CL','CM','CN',
  'CO','CR','CU','CV','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','ER','ES','ET','FI',
  'FJ','FM','FR','GA','GB','GD','GE','GH','GM','GN','GQ','GR','GT','GW','GY','HK','HN','HR','HT',
  'HU','ID','IE','IL','IN','IQ','IS','IT','JM','JO','JP','KE','KG','KH','KI','KM','KN','KR','KW',
  'KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MG','MH','MK',
  'ML','MM','MN','MO','MR','MT','MU','MV','MW','MX','MY','MZ','NA','NE','NG','NI','NL','NO','NP',
  'NR','NZ','OM','PA','PE','PG','PH','PK','PL','PT','PW','PY','QA','RO','RS','RU','RW','SA','SB',
  'SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SZ','TD','TG','TH','TJ',
  'TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE','VN','VU',
  'WS','YE','ZA','ZM','ZW',
] as const;

/** Shown at the top of the list — the studio's busiest destinations. */
const POPULAR = ['US', 'GB', 'AU', 'CA', 'AE', 'DE', 'FR', 'NL', 'SG', 'IN', 'LK'];

export interface Country {
  code: string;
  name: string;
}

export function getCountries(locale = 'en'): Country[] {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    display = null;
  }

  const all: Country[] = CODES.map((code) => ({
    code: code as string,
    name: display?.of(code) ?? code,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const popular = POPULAR.map((code) => all.find((c) => c.code === code)).filter(
    (c): c is Country => Boolean(c),
  );

  const rest = all.filter((c) => !POPULAR.includes(c.code));

  return [...popular, ...rest];
}

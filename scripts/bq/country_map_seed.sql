-- Identity ISO2 + explicit names only. Do NOT insert unmapped DISTINCT leftovers.
DELETE FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map` WHERE TRUE;

INSERT INTO `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map` (raw_string, country_iso2, source)
SELECT * FROM UNNEST([
  STRUCT('at' AS raw_string, 'AT' AS country_iso2, 'identity' AS source),
  ('be','BE','identity'), ('bg','BG','identity'), ('hr','HR','identity'),
  ('cy','CY','identity'), ('cz','CZ','identity'), ('dk','DK','identity'),
  ('ee','EE','identity'), ('fi','FI','identity'), ('fr','FR','identity'),
  ('de','DE','identity'), ('gr','GR','identity'), ('hu','HU','identity'),
  ('ie','IE','identity'), ('it','IT','identity'), ('lv','LV','identity'),
  ('lt','LT','identity'), ('lu','LU','identity'), ('mt','MT','identity'),
  ('nl','NL','identity'), ('pl','PL','identity'), ('pt','PT','identity'),
  ('ro','RO','identity'), ('sk','SK','identity'), ('si','SI','identity'),
  ('es','ES','identity'), ('se','SE','identity'), ('gb','GB','identity'),
  ('us','US','identity'), ('sg','SG','identity'), ('jp','JP','identity'),
  ('ch','CH','identity'), ('no','NO','identity'), ('is','IS','identity'),
  ('ua','UA','identity'), ('tr','TR','identity'), ('ca','CA','identity'),
  ('au','AU','identity'), ('in','IN','identity'), ('cn','CN','identity'),
  ('kr','KR','identity'), ('br','BR','identity'), ('mx','MX','identity'),
  ('ae','AE','identity'), ('il','IL','identity'), ('za','ZA','identity'),
  ('uk','GB','name'), ('great britain','GB','name'), ('united kingdom','GB','name'),
  ('england','GB','name'), ('el','GR','name'), ('greece','GR','name'),
  ('germany','DE','name'), ('deutschland','DE','name'),
  ('czechia','CZ','name'), ('czech','CZ','name'), ('czech republic','CZ','name'),
  ('netherlands','NL','name'), ('holland','NL','name'),
  ('usa','US','name'), ('united states','US','name'), ('united states of america','US','name'),
  ('china','CN','name'), ('korea, republic of','KR','name'), ('south korea','KR','name'),
  ('spain','ES','name'), ('france','FR','name'), ('italy','IT','name'),
  ('poland','PL','name'), ('sweden','SE','name'), ('austria','AT','name'),
  ('switzerland','CH','name'), ('belgium','BE','name'), ('ireland','IE','name'),
  ('denmark','DK','name'), ('finland','FI','name'), ('norway','NO','name'),
  ('estonia','EE','name'), ('portugal','PT','name'), ('singapore','SG','name'),
  ('canada','CA','name'), ('australia','AU','name'), ('india','IN','name'),
  ('japan','JP','name'), ('brazil','BR','name'), ('mexico','MX','name')
]);

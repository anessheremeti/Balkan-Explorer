// Openly licensed photos from Wikimedia Commons used across the site.
// CC BY requires crediting the author with a link to the licence; they are
// listed on /photo-credits (linked from the footer). Add a row when adding one.

export interface PhotoCredit {
  /** What the photo shows */
  subject: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** Commons file page */
  source: string;
}

const BY2 = { license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" };
const BY3 = { license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" };
const BY4 = { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" };
const CC0 = { license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" };
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const PHOTO_CREDITS: PhotoCredit[] = [
  { subject: "Berat old town", author: "Pero Kvrzica", ...BY2, source: commons("Old_town_of_berat_2_albania_2016.jpg") },
  { subject: "Berat old town", author: "Pero Kvrzica", ...BY2, source: commons("Old_town_of_berat_1.jpg") },
  { subject: "Berat old town", author: "Pero Kvrzica", ...BY2, source: commons("Old_town_of_berat_albania_3.jpg") },
  { subject: "Berat from the castle", author: "godo godaj", ...BY2, source: commons("Berat_Albania.jpg") },
  { subject: "Theth valley", author: "Peter Chovanec", ...BY2, source: commons("Theth_and_Theth_National_Park,_Albania_2017.jpg") },
  { subject: "Theth National Park", author: "Alexkom000", ...BY4, source: commons("2024-10-14_Theth_National_Park_23.jpg") },
  { subject: "Theth village", author: "Petrit Gjeçaj", ...BY3, source: commons("Qender_Theth,_Albania_-_panoramio_(2).jpg") },
  { subject: "Theth church", author: "peter_h", ...CC0, source: commons("Theth_Church_Albania.jpg") },
  { subject: "Ksamil", author: "savagecat", ...BY2, source: commons("Ksamil_albania_2016.jpg") },
  { subject: "Budva", author: "Anton Nikiforov", ...BY3, source: commons("Budva,_Montenegro_-_panoramio_(12).jpg") },
  { subject: "Sveti Stefan", author: "Anton Nikiforov", ...BY3, source: commons("Sveti_Stefan,_Montenegro_-_panoramio_(4).jpg") },
  { subject: "Rugova Canyon", author: "SUHEJLO", ...BY4, source: commons("Rugova_Canyon_%E2%80%93_Peja,_Kosovo.jpg") },
  { subject: "Valbona valley", author: "Visar Arifaj", ...BY4, source: commons("Sheep_in_Valbona_Valley,_Tropoje.jpg") },
];

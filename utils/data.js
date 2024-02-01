import bcrypt from 'bcryptjs';

export const data = {
  users: [
    {
      email: 'toto@example.com',
      password: bcrypt.hashSync('123456'),
    },
    {
      email: 'jean@example.com',
      password: bcrypt.hashSync('123456'),
    },
  ],
  // books: [
  //   {
  //     // _id: '1',
  //     userId: '1',
  //     title: 'les miserables',
  //     author: 'victor hugo',
  //     imageUrl:
  //       'https://books.google.fr/books/content?id=wzDr2I8DWMAC&hl=fr&pg=PP9&img=1&zoom=3&bul=1&sig=ACfU3U3BAqrJEwjwm2YlbaICpnDZ-41F1g&w=1025',
  //     year: 1862,
  //     genre: 'roman',
  //     // ratings: [ratingSchema],
  //     averageRating: 5,
  //   },
  //   {
  //     // _id: '2',
  //     userId: '2',
  //     title: 'Tintin au Tibet',
  //     author: 'victor hugo',
  //     imageUrl:
  //       'https://books.google.fr/books/publisher/content?id=a64_DwAAQBAJ&hl=fr&pg=PP1&img=1&zoom=3&bul=1&sig=ACfU3U0vzIQCJUNcfQhWmQx_K8wUADU5aw&w=1280',
  //     year: 1959,
  //     genre: 'bande dessiné',
  //     // ratings: [ratingSchema],
  //     averageRating: 5,
  //   },
  // ],
};

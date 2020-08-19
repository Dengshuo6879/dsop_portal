export default [
  {
    path: '/',
    component: '../layouts/BasicLayout',
    routes: [
      {
        path: '/',
        component: './Spec',
      },
      {
        component: './404',
      },
    ],
  },
  {
    component: './404',
  },
];

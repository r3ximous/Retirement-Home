import menu from "../../../prisma/menu.json";

export const menuItems = menu.categories.flatMap((category) => category.items);

export type MenuItem = (typeof menuItems)[number];

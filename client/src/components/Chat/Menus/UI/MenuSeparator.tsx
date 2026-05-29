import type { FC } from 'react';

const MenuSeparator: FC = () => (
  <div
    role="separator"
    aria-orientation="horizontal"
    className="my-1.5 border-b bg-surface-tertiary dark:border-border-light"
  />
);

export default MenuSeparator;

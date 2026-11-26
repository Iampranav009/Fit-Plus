import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="text-[0.8125rem] text-[#A2A8B5]">
    <ol className="flex flex-wrap items-center gap-1">
      <li className="flex items-center gap-1">
        <Link to="/" className="hover:text-[#F3EEE7] transition-colors">
          Home
        </Link>
      </li>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={item.label} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            {isLast || !item.to ? (
              <span aria-current="page" className="text-[#F3EEE7]">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-[#F3EEE7] transition-colors">
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

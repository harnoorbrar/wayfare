/**
 * Business catalog. Base numbers match the pre-v1.4 BUSINESS_TYPES list so
 * existing saves keep their economics; staffing fields are new.
 */
import type { BusinessType } from '../domain/businesses';

export const BUSINESS_TYPES: readonly BusinessType[] = [
  {
    id: 'lemonade', name: 'Lemonade Stand', icon: '🍋', cost: 500,
    weeklyRevenue: 60, weeklyExpense: 20, minSmarts: 0, category: 'Food',
    maxStaff: 1, staffSalaryWeek: 30, staffRevenueWeek: 45,
  },
  {
    id: 'foodtruck', name: 'Food Truck', icon: '🌮', cost: 8000,
    weeklyRevenue: 600, weeklyExpense: 380, minSmarts: 15, category: 'Food',
    maxStaff: 2, staffSalaryWeek: 250, staffRevenueWeek: 380,
  },
  {
    id: 'onlinestore', name: 'Online Store', icon: '🛒', cost: 5000,
    weeklyRevenue: 450, weeklyExpense: 250, minSmarts: 25, category: 'Retail',
    maxStaff: 2, staffSalaryWeek: 220, staffRevenueWeek: 320,
  },
  {
    id: 'coffeeshop', name: 'Coffee Shop', icon: '☕', cost: 25000,
    weeklyRevenue: 1800, weeklyExpense: 1200, minSmarts: 30, category: 'Food',
    maxStaff: 4, staffSalaryWeek: 350, staffRevenueWeek: 520,
  },
  {
    id: 'consulting', name: 'Consulting Firm', icon: '📊', cost: 15000,
    weeklyRevenue: 1400, weeklyExpense: 700, minSmarts: 60, category: 'Services',
    maxStaff: 3, staffSalaryWeek: 700, staffRevenueWeek: 1050,
  },
  {
    id: 'realestate', name: 'Rental Properties', icon: '🏗️', cost: 100000,
    weeklyRevenue: 2200, weeklyExpense: 900, minSmarts: 40, category: 'Real Estate',
    maxStaff: 3, staffSalaryWeek: 500, staffRevenueWeek: 700,
  },
  {
    id: 'techstartup', name: 'Tech Startup', icon: '🚀', cost: 60000,
    weeklyRevenue: 4000, weeklyExpense: 3200, minSmarts: 75, category: 'Tech',
    maxStaff: 5, staffSalaryWeek: 1100, staffRevenueWeek: 1700,
  },
] as const;

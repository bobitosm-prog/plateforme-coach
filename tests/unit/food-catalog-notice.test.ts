// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import FoodCatalogNotice from '@/app/components/nutrition-v2/FoodCatalogNotice'
import fr from '@/messages/fr.json'
import en from '@/messages/en.json'
import de from '@/messages/de.json'
afterEach(cleanup)
it.each([['fr',fr],['en',en],['de',de]] as const)('exposes source and calculation limitations inline in %s', (locale,messages)=>{
 render(React.createElement(NextIntlClientProvider,{locale,messages,children:React.createElement(FoodCatalogNotice)}))
 const summary=screen.getByText(messages.food_catalog.title)
 fireEvent.click(summary)
 expect(summary.closest('details')?.open).toBe(true)
 expect(screen.getByText(messages.food_catalog.values)).toBeTruthy()
 expect(screen.getByRole('link',{name:'ANSES · Ciqual 2025'}).getAttribute('href')).toBe('https://doi.org/10.57745/RDMHWY')
})

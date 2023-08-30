export const HAIR_SERVICES: {
  title: string
  items: {
    title: string
    description?: string
  }[]
}[] = [
  {
    title: 'Blonding',
    items: [
      {
        title: 'Balayage',
        description:
          'Personalized technique to provide a more lived in colour, with lower maintenance',
      },
      {
        title: 'Highlighting',
        description: 'Creates lightness, dimension and / or depth',
      },
      {
        title: 'Global Blonding',
        description:
          'Root to end blonding application to give the full blonde effect',
      },
    ],
  },
  {
    title: 'Colouring',
    items: [
      {
        title: 'Root Retouch',
        description:
          'This is ideal for someone looking to provide coverage for their growth whether it be for grey or natural roots. A service preformed anywhere from 4 - 8 weeks from the initial service',
      },
      {
        title: 'Full Color',
        description: 'Root to end colour change or colour maintenance',
      },
      {
        title: 'Toner Refresh',
        description:
          'Ideal for a client looking to revitalize their current colour with minimal change',
      },
      {
        title: 'Colour / Highlight Combo',
        description:
          'Ideal for a client looking for root coverage as well as adding depth and dimension',
      },
    ],
  },
  {
    title: 'Haircuts & Styling',
    items: [
      {
        title: 'Womans Cut',
      },
      {
        title: 'Mens Cut',
      },
      {
        title: 'Kids Cut',
      },
      {
        title: 'Treatment & Blow-dry Style',
      },
    ],
  },
]

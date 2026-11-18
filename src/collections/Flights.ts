import type { Access, CollectionConfig } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'

export const Flights: CollectionConfig = {
  slug: 'flights',
  access: {
    create: isPayloadAdmin,
    delete: isPayloadAdmin,
    read: () => true,
    update: isPayloadAdmin,
  },
  admin: {
    group: 'Flight Operations',
    defaultColumns: ['flightNumber', 'origin', 'destination', 'scheduledDeparture', 'delayMinutes'],
    useAsTitle: 'flightNumber',
  },
  fields: [
    {
      name: 'flightNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'carrier',
      type: 'select',
      required: true,
      options: ['SkyWest', 'Delta', 'United', 'JetBlue', 'American'],
    },
    {
      name: 'origin',
      type: 'select',
      required: true,
      options: ['ATL', 'BOS', 'JFK', 'LAX', 'ORD', 'SEA', 'SFO'],
    },
    {
      name: 'destination',
      type: 'select',
      required: true,
      options: ['ATL', 'BOS', 'JFK', 'LAX', 'ORD', 'SEA', 'SFO'],
    },
    {
      name: 'scheduledDeparture',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'weather',
      type: 'select',
      required: true,
      options: ['Clear', 'Cloudy', 'Rain', 'Snow', 'Thunderstorm'],
    },
    {
      name: 'dayType',
      type: 'select',
      required: true,
      options: ['Weekday', 'Weekend'],
    },
    {
      name: 'delayCause',
      type: 'select',
      required: true,
      options: ['None', 'Weather', 'Carrier', 'Air traffic', 'Late aircraft', 'Security'],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'delayMinutes',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'distanceKm',
          type: 'number',
          required: true,
          min: 1,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'windSpeedKph',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'visibilityKm',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'airportCongestion',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
        },
      ],
    },
  ],
  versions: false,
}

import { Portal } from '@ark-ui/react/portal'
import { Select } from '@ark-ui/react/select'
import { createListCollection } from '@ark-ui/react/select'
import type { Meta, StoryObj } from '@storybook/react'

const playerCounts = createListCollection({
  items: [
    { label: '2 players', value: '2' },
    { label: '3 players', value: '3' },
    { label: '4 players', value: '4' },
    { label: '5 players', value: '5' },
    { label: '6 players', value: '6' },
  ],
})

function PlayerCountSelect() {
  return (
    <div style={{ padding: '2rem', background: 'var(--background-color)', minHeight: '100vh', color: 'var(--text-color)' }}>
      <Select.Root collection={playerCounts} defaultValue={['3']}>
        <Select.Label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Number of players
        </Select.Label>
        <Select.Control>
          <Select.Trigger
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '200px',
              padding: '0.5rem 0.75rem',
              background: 'var(--modal-background-color)',
              border: '1px solid var(--modal-border-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            <Select.ValueText placeholder="Select..." />
            <Select.Indicator>▾</Select.Indicator>
          </Select.Trigger>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content
              style={{
                background: 'var(--modal-background-color)',
                border: '1px solid var(--modal-border-color)',
                borderRadius: '6px',
                padding: '0.25rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                minWidth: '200px',
              }}
            >
              {playerCounts.items.map(item => (
                <Select.Item
                  key={item.value}
                  item={item}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: 'var(--text-color)',
                  }}
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </div>
  )
}

const meta: Meta = {
  title: 'UI / Select',
  component: PlayerCountSelect,
}

export default meta
type Story = StoryObj

export const Default: Story = {}

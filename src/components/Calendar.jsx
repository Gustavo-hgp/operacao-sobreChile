import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import 'react-day-picker/style.css'

// Cores da marca aplicadas via CSS vars do react-day-picker.
const brandStyle = {
  '--rdp-accent-color': '#176DB0',
  '--rdp-accent-background-color': '#e7eefb',
  '--rdp-today-color': '#F80000',
  '--rdp-range_middle-background-color': '#e7eefb',
  '--rdp-range_middle-color': '#293797',
}

export default function Calendar(props) {
  return (
    <div style={brandStyle}>
      <DayPicker locale={ptBR} weekStartsOn={1} {...props} />
    </div>
  )
}

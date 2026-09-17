import { useEffect, useState } from 'react'
import { Fuel } from 'lucide-react'
import { LoadingState } from '../States'
import { useLegFuel } from '../../hooks/useFlightFile'

/**
 * L'onglet FUEL — tabFuel() de l'annexe (prototype l. 15495).
 *
 * <b>La forme est la sienne</b> : la rangee de cartes (fournisseur, prix, et la
 * validite du tarif quand elle est connue), le convertisseur de prix, le bouton
 * « Fuel Release ».
 *
 * <b>Le fournisseur vient de l'onglet SERVICES</b>, c'est-a-dire de la demande
 * de carburant de l'escale de depart. L'annexe tirait un nom au hasard quand
 * aucun tarif n'etait importe (l. 14304), si bien que le meme dossier pouvait
 * nommer deux fournisseurs differents sur deux onglets.
 *
 * <b>Et « NO DATA » quand aucun tarif n'est en vigueur.</b> L'annexe inventait
 * un prix entre 4,20 et 6,50 $. Un prix invente devient une facture fausse : ici
 * l'ecran dit que la liste ne couvre pas cette escale.
 */

/** Un gallon US, en litres — la constante de l'annexe (FuelPriceDB). */
const LITERS_PER_USG = 3.785411784

export default function FuelTab({ row }) {
  const fuel = useLegFuel(row.legId)

  if (fuel.isLoading) return <LoadingState label="Reading the fuel price for this leg…" />
  if (fuel.isError) {
    return <div className="fd-banner warn">Fuel unavailable — {fuel.error.message}</div>
  }

  const data = fuel.data
  const symbol = data?.currency === 'EUR' ? '€' : '$'
  const perLiter = data?.unit === 'LITER'
  const priceLabel = data?.price == null
    ? 'NO DATA'
    : `${symbol}${Number(data.price).toFixed(4)} / ${perLiter ? 'L' : 'USG'}`

  const window_ = [data?.effectiveFrom, data?.effectiveTo].filter(Boolean)

  return (
    <>
      <div className="fd-grid" style={{ marginBottom: 16 }}>
        <div className="fd-card">
          <div className="lbl">Fuel Supplier</div>
          <div className="val">{data?.supplierName ?? 'NOT SELECTED'}</div>
        </div>
        <div className="fd-card">
          <div className="lbl">Fuel Price</div>
          <div className="val mono">{priceLabel}</div>
        </div>
        {window_.length ? (
          <div className="fd-card">
            <div className="lbl">Price Updated / Expiry</div>
            <div className="val">
              {window_.length === 2 ? `${window_[0]} → ${window_[1]}` : `from ${window_[0]}`}
            </div>
          </div>
        ) : null}
      </div>

      {data?.supplierName == null ? (
        <div className="fd-banner warn">
          {/* Dire ou le geste se fait, plutot que de laisser l'agent chercher. */}
          No fuel supplier on this leg — open the SERVICES tab and pick one on the
          departure station.
        </div>
      ) : null}

      {data?.price == null ? (
        <div className="fd-banner warn">
          No fuel price in force at {data?.stationIcao ?? 'this station'} on the day of the flight.
          Import the supplier price list before quoting an uplift.
        </div>
      ) : (
        <PriceConverter price={Number(data.price)} perLiter={perLiter} symbol={symbol} />
      )}

      <button
        type="button"
        className="fd-fuel-btn"
        disabled={!data?.supplierName}
        title={data?.supplierName
          ? `Draft the fuel release for ${data.supplierName} at ${data.stationIcao}`
          : 'Pick a fuel supplier on the SERVICES tab first'}
      >
        <Fuel size={15} /> Fuel Release
      </button>
    </>
  )
}

/**
 * Le convertisseur de prix — wireFuelConverter() de l'annexe (l. 15528), aux
 * memes quatre decimales. Un fournisseur cote au gallon, un aeroport europeen
 * facture au litre, et l'ecart se joue sur la troisieme decimale.
 */
function PriceConverter({ price, perLiter, symbol }) {
  const initialUsg = perLiter ? price * LITERS_PER_USG : price
  const [usg, setUsg] = useState(initialUsg.toFixed(4))
  const [liter, setLiter] = useState((initialUsg / LITERS_PER_USG).toFixed(4))

  // Changer d'etape en gardant le panneau ouvert doit repartir du tarif de la
  // nouvelle, pas garder la saisie faite sur la precedente.
  useEffect(() => {
    setUsg(initialUsg.toFixed(4))
    setLiter((initialUsg / LITERS_PER_USG).toFixed(4))
  }, [initialUsg])

  return (
    <div className="fd-fuel-converter">
      <div className="ffc-title">⛽ Price Converter</div>
      <div className="ffc-row">
        <div className="ffc-field">
          <label htmlFor="fuelConvUsg">{symbol} / USG</label>
          <input
            id="fuelConvUsg" type="number" step="0.0001" value={usg}
            onChange={(event) => {
              setUsg(event.target.value)
              const value = parseFloat(event.target.value)
              if (!Number.isNaN(value)) setLiter((value / LITERS_PER_USG).toFixed(4))
            }}
          />
        </div>
        <div className="ffc-arrow">⇄</div>
        <div className="ffc-field">
          <label htmlFor="fuelConvLiter">{symbol} / Liter</label>
          <input
            id="fuelConvLiter" type="number" step="0.0001" value={liter}
            onChange={(event) => {
              setLiter(event.target.value)
              const value = parseFloat(event.target.value)
              if (!Number.isNaN(value)) setUsg((value * LITERS_PER_USG).toFixed(4))
            }}
          />
        </div>
      </div>
    </div>
  )
}

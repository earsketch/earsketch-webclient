import { MutableRefObject, useEffect, useRef, useState } from "react"

// Useful for preventing absolute-positioned elements from exceeding window height.
export const useHeightLimiter = (show: boolean, marginBottom: string|null = null): [MutableRefObject<HTMLDivElement|null>, React.CSSProperties] => {
    const [height, setHeight] = useState('100vh')
    const el = useRef<HTMLDivElement|null>(null)

    const handleResize = () => {
        const elem = el.current
        elem && setHeight(`calc(100vh - ${elem.getBoundingClientRect().top}px${marginBottom ? ' - ' + marginBottom : ''})`)
    }

    useEffect(() => {
        if (show) {
            window.addEventListener('resize', handleResize)
            handleResize()
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [show])

    return [el, { maxHeight: height, overflowY: 'auto' }]
}
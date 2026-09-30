import { useTranslation } from "react-i18next"

import teachersLogo from "./teachers_logo.png"

/** Show the active banner */
export const HeaderBanner = () => {
    // No frills - just return whatever banner you want to be active
    return <EarSketchTeachersCompetitionBanner />
}

const COMPETITION_URL = "https://teachers.earsketch.org/2026-synthesize-your-inspirations"

const CompetitionBannerLink = ({ children }: { children: React.ReactNode }) => {
    const { t } = useTranslation()
    return (<div className="hidden w-full lg:flex justify-evenly">
        <a href={COMPETITION_URL}
            aria-label={`${t("banner.competition.title")}: ${t("banner.competition.kicker")}`}
            target="_blank"
            className="flex items-center text-center uppercase whitespace-nowrap"
            rel="noreferrer">
            <img style={{ height: "24px" }} className="hidden xl:block mr-3" src={teachersLogo} id="comp-logo" alt=""/>
            <div className="flex flex-col items-center">{children}</div>
        </a>
    </div>)
}

/** Competition banner: small event label above the competition name */
export const EarSketchTeachersCompetitionBanner = () => {
    const { t } = useTranslation()
    return (<CompetitionBannerLink>
        <div className="text-amber text-xs tracking-widest leading-[18px]">{t("banner.competition.kicker")}</div>
        <div className="text-white text-lg font-medium tracking-wide leading-[22px]">{t("banner.competition.title")}</div>
    </CompetitionBannerLink>)
}

/** A banner linking to info about the EarSketch Summit */
export const EarSketchSummitBanner = () => {
    return (<div className="hidden w-full lg:flex justify-evenly">
        <a href="https://gatech.zoom.us/webinar/register/7917465553949/WN_3Z4_z1OHR_2NexLYdccNvA"
            aria-label="Link to EarSketch SUMMIT Registration"
            target="_blank"
            className="text-center"
            rel="noreferrer">
            <div className="flex flex-col items-center">
                <div className="text-amber">JOIN US AT THE EARSKETCH SUMMIT</div>
                <div className="text-gray-200 text-xs">MAY 21 &bull; 10AM-12PM ET</div>
            </div>
        </a>
    </div>)
}

export default HeaderBanner

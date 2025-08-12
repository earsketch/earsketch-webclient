import teachersLogo from "./teachers_logo.png"

/** Show the active banner */
export const HeaderBanner = () => {
    // No frills - just return whatever banner you want to be active
    return <EarSketchTeachersCompetitionBanner />
}

/** A banner for competitions run by our team */
export const EarSketchTeachersCompetitionBanner = () => {
    return (<div className="hidden w-full lg:flex justify-evenly">
        <a href="https://www.teachers.earsketch.org/compete"
            aria-label="Link to the competition website"
            target="_blank"
            className="text-black uppercase dark:text-white text-center"
            style={{ color: "yellow", textShadow: "1px 1px #FF0000", lineHeight: "21px", fontSize: "18px" }}
            rel="noreferrer">
            <div className="flex flex-col items-center">
                <img style={{ height: "20px" }} src={teachersLogo} id="comp-logo" alt="Link to the competition site"/>
                <div>Remix Competition</div>
            </div>
        </a>
    </div>)
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

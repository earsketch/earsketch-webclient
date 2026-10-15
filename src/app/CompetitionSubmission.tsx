import { ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const CompetitionSubmission = ({ name, shareID, close }: { name: string, shareID: string, close: () => void }) => {
    return <>
        <ModalHeader><i className="icon icon-share2 mr-3" /> Submit &quot;{name}&quot; to Competition</ModalHeader>
        <ModalBody>
            <div className="share-script-menu-descriptions text-lg">
                Enter your script to the <a href="https://teachers.earsketch.org/2026-synthesize-your-inspirations" target="_blank" rel="noreferrer"> Competition.</a>
            </div>
            <div>
                <div className="text-lg text-center mb-4">
                    <div className="modal-section-header w-full m-0">
                        <span>Competition Rules</span>
                    </div>
                    <ul className="list-disc text-left p-5 pl-10 space-y-1 bg-gray-100 dark:bg-gray-800">
                        <li>Submission deadline is 11:59PM PST on December 14th, 2026</li>
                        <li>Song must be between 30 seconds and 2 minutes</li>
                        <li>Song must have at least five unique sounds</li>
                        <li>Song must include sounds from more than one artist including John Fossitt</li>
                        <li>Students can only submit one song for the competition</li>
                        <li>A reflection describing song&apos;s message and inspiration must be included with submission</li>
                        <li>For more information, please visit the <a href="https://teachers.earsketch.org/2026-synthesize-your-inspirations" target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400">competition website</a>.</li>
                    </ul>
                </div>
                <div className="text-center m-auto">
                    <a href={"https://gatech.co1.qualtrics.com/jfe/form/SV_5mtWGCTD14SJ9OK?EarSketchShareID=".concat(shareID)} target="_blank" rel="noreferrer">
                        <button style={{ minWidth: "270px", fontSize: "26px", color: "black", background: "#d3d25a" }}>Click Here to Submit</button>
                    </a>
                </div>
            </div>
        </ModalBody>

        <ModalFooter close={close} />
    </>
}

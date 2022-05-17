import React from "react"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const CompetitionSubmission = ({ name, shareID, close }: { name: string, shareID: string, close: () => void }) => {
    return <>
        <ModalHeader><i className="icon icon-share2 mr-3" /> Submit &quot;{name}&quot; to Competition</ModalHeader>
        <ModalBody>
            <div className="share-script-menu-descriptions text-lg">
                Enter your script to the <a href="https://www.amazonfutureengineer.com/yourvoiceispower" target="_blank" rel="noreferrer"> Competition.</a>
            </div>
            <div>
                <div className="text-lg text-center mb-4">
                    <div className="modal-section-header w-full m-0">
                        <span>Competition Rules</span>
                    </div>
                    <ul className="list-disc text-left p-5 pl-10 space-y-1 bg-gray-100 dark:bg-gray-800">
                        <li>Submission deadline for Round 1 is 11:59PM EST on February 7, 2022</li>
                        <li>Submission deadline for Round 2 is 11:59PM EST on June 19, 2022</li>
                        <li>Song must be between 30 seconds and 3 minutes, include 5 unique musical tracks, and a stem from the Entrepreneur Song by Pharrell Williams (MS/HS students must also include one custom function)</li>
                        <li>Song needs to be a “Remix” of one of the three featured songs (Entrepreneur, New Normal, Underdog)</li>
                        <li>A reflection describing song message must be included with song submission</li>
                        <li>Students can submit one song per round</li>
                        <li>Students can work alone or with one partner</li>
                        <li>For more information, please visit the <a href="https://www.amazonfutureengineer.com/yourvoiceispower" target="_blank" rel="noreferrer">competition website</a>.</li>
                    </ul>
                </div>
                <div className="text-center m-auto">
                    <a href={"https://rocketjudge.com/register/WL8i2vts#scriptid=".concat(shareID)} target="_blank" rel="noreferrer">
                        <button style={{ minWidth: "270px", fontSize: "26px", color: "black", background: "#d3d25a" }}>Click Here to Submit</button>
                    </a>
                </div>
            </div>
        </ModalBody>

        <ModalFooter close={close} />
    </>
}

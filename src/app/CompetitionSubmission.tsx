import React from "react"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const CompetitionSubmission = ({ name, shareID, close }: { name: string, shareID: string, close: () => void }) => {
    return <>
        <ModalHeader><i className="icon icon-share2 mr-3" /> Submit &quot;{name}&quot; to Competition</ModalHeader>
        <ModalBody>
            <div className="share-script-menu-descriptions text-lg">
                Enter your script to the <a href="https://www.teachers.earsketch.org/compete" target="_blank" rel="noreferrer"> Competition.</a>
            </div>
            <div>
                <div className="text-lg text-center mb-4">
                    <div className="modal-section-header w-full m-0">
                        <span>Competition Rules</span>
                    </div>
                    <ul className="list-disc text-left p-5 pl-10 space-y-1 bg-gray-100 dark:bg-gray-800">
                        <li>Submission deadline is 11:59PM PST on September 30th, 2024</li>
                        <li>Song must be between 30 seconds and 2 minutes, include 5 unique musical tracks, and be a remix including stems from more than one artist</li>
                        <li>A reflection describing song&apos;s message must be included with submission</li>
                        <li>Students can only submit one song for the competition</li>
                        <li>Students can work alone or in groups up to fours (prizes will be split among teams)</li>
                        <li>For more information, please visit the <a href="https://www.teachers.earsketch.org/compete" target="_blank" rel="noreferrer">competition website</a>.</li>
                    </ul>
                </div>
                <div className="text-center m-auto">
                    <a href={"https://www.rocketjudge.com/register/Jg8UUOFs#scriptid=".concat(shareID)} target="_blank" rel="noreferrer">
                        <button style={{ minWidth: "270px", fontSize: "26px", color: "black", background: "#d3d25a" }}>Click Here to Submit</button>
                    </a>
                </div>
            </div>
        </ModalBody>

        <ModalFooter close={close} />
    </>
}

import { GraphItem } from "./graph.graphItem";
import { INode, IOlink } from "./graph.interfaces";

export class GraphOLink extends GraphItem implements IOlink {
    public oini: INode;
    public ofin: INode;

    public constructor(oini: INode, ofin: INode) {
        super();
        this.oini = oini;
        this.ofin = ofin;
        oini.onsc().push(this);
        ofin.opsc().push(this);
    }

    public dispose(): void {
        let tmp = this.oini.onsc();
        tmp.splice(tmp.indexOf(this), 1);
        tmp = this.oini.opsc();
        tmp.splice(tmp.indexOf(this), 1);
        super.dispose();
    }
}

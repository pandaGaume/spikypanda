import { GraphItem } from "./graph.graphItem";
import { INode, IOlink } from "./graph.interfaces";

export class GraphOLink extends GraphItem implements IOlink {
    public oini: INode;
    public ofin: INode;

    public constructor(oini: INode, ofin: INode) {
        super();
        this.oini = oini;
        this.ofin = ofin;
        oini.onsc()?.push(this) ?? [this];
        ofin.opsc()?.push(this) ?? [this];
    }
}

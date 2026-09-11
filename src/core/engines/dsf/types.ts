export interface DsfHeader {
	fileSize: number;
	metadataOffset: number;
	formatVersion: number;
	formatId: number;
	channelType: number;
	channelCount: number;
	samplingFrequency: number;
	bitsPerSample: number;
	sampleCount: number;
	blockSizePerChannel: number;
	dataOffset: number;
	dataLength: number;
}

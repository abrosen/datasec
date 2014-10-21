#include <stdio.h>
#include <stdlib.h>

static char a[100] = "hello <insert name here>";
	

int main(){ 
	//char *source;
	//char *binary;
	char buffer[10000];
	FILE *op; 
	op = fopen("worm","rb");
	fread(buffer,sizeof(char), sizeof(buffer),op);
	printf("%s\n",a);
	fclose(op);
	
	int i;
	for(i = 0; i<10000; i++){
		if(buffer[i] == '<' && buffer[i+1]=='i' && buffer[i+2] == 'n') {
			buffer[i] = 'A';
			buffer[i+1] = 'n';
			buffer[i+2] = 'd';
			buffer[i+3] = 'r';
			buffer[i+4] = 'e';
			buffer[i+5] = 'w';
			buffer[i+6] = ' ';
			buffer[i+7] = ' ';
			buffer[i+8] = ' ';
			buffer[i+9] = ' ';
			buffer[i+10] = ' ';
			buffer[i+11] = ' ';
			buffer[i+12] = ' ';
			buffer[i+13] = ' ';
			buffer[i+14] = ' ';
			buffer[i+15] = ' ';
			buffer[i+16] = ' ';
			buffer[i+17] = ' ';
		}
	}

	op = fopen("wormy","wb");
	fwrite(buffer,sizeof(char), sizeof(buffer),op);
	fclose(op);
	system("mv wormy worm; chmod +x worm");
	return 0;
}

